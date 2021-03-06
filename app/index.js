import React, {
    Component,
} from 'react'
import ReactDOM from 'react-dom'
import querystring from 'querystring'

class App extends Component {
    constructor(props) {
        super(props)

        this.state = {
            nums: [],
        }
    }

    onResult = (nums) => {
        this.setState({
            nums,
        })
    }

    render() {
        return (
            <div style={{
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
            }}>
                <Condition onResult={this.onResult} />
                <Nums nums={this.state.nums} />
            </div>
        )
    }
}

class Condition extends Component {
    constructor(props) {
        super(props)
        this.like = '1..........'
        this.search
        this.contain
        this.no4 = false
    }

    onLikeChange = (like) => {
        this.like = like.replace(/ /g, '.')
    }
    onLikeEnd = () => {
        this.search.focus()
    }
    onContainChange = (contain) => {
        this.contain = contain
    }

    onNo4Change = (checked) => {
        this.no4 = checked
    }

    onSearch = async () => {
        const param = querystring.stringify({
            like: this.like,
            contain: this.contain,
            no4: this.no4,
        })
        const datas = await fetch(`http://localhost:3000/api/num?${param}`)
            .then(res => res.json())

        this.props.onResult && this.props.onResult(datas)
    }

    render() {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'row',
            }}>
                <div style={{
                    display: 'flex',
                    flex: 8,
                    flexDirection: 'column',
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                    }}>
                        精确搜索:
                        <Like
                            onChange={this.onLikeChange}
                            onEnd={this.onLikeEnd}
                        />
                    </div>
                    <div>
                        模糊搜索:
                        <input id="contain" type="number" onChange={event => this.onContainChange(event.target.value)} />
                    </div>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                    }}>
                        <div><input id="no4" type="checkbox" onChange={event => this.onNo4Change(event.target.checked)} /> 不含 4</div>
                    </div>
                </div>
                <div style={{
                    display: 'flex',
                    flex: 2,
                }}>
                    <button
                        onClick={this.onSearch}
                        ref={btn => this.search = btn}
                    >
                        Secondary
                    </button>
                </div>
            </div>
        )
    }
}

class Like extends Component {
    constructor(props) {
        super(props)
        this.state = {
            num: '1          ',
        }
        this.inputs = {}
    }

    onChange = (index, oldValue, newValue) => {
        // 控制输入为一个字符
        const diffValue = newValue.replace(oldValue, '') || ' '
        if (!/^\d|\s$/.test(diffValue)) {
            return
        }

        // 文字
        const newNumArr = this.state.num.split('')
        newNumArr[index] = diffValue
        const newNum = newNumArr.join('')
        this.setState({
            num: newNum,
        })

        // Focus
        if (this.inputs.hasOwnProperty(index + 1)) {
            const nextInput = this.inputs[index + 1]
            nextInput.select()
        } else {
            this.props.onEnd && this.props.onEnd()
        }

        // 回调
        this.props.onChange && this.props.onChange(newNum)
    }

    onFocus = (event) => {
        event.target.select()
    }

    render() {
        const child = this.state.num.split('').map((ele, index) => <input
            style={{
                display: 'flex',
                flex: 1,
                minWidth: 10,
                maxWidth: 60,
                type: 'number',
            }}
            key={index}
            value={this.state.num[index]}
            onChange={(event) => { this.onChange(index, ele, event.target.value) }}
            onFocus={this.onFocus}
            ref={(input) => {
                this.inputs[index] = input
            }}
        />)

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
            }}>
                {child}
            </div>
        )
    }
}

class Nums extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        const now = new Date().valueOf()
        const rows = this.props.nums
            // .filter(data => data.timestamp + 3 * 24 * 60 * 60 > now)    // 三天之内的数据
            .sort((a, b) => parseInt(a.num) - parseInt(b.num))
            .map(data =>
                <tr>
                    <th>{data.num}</th>
                    <th>{data.price}</th>
                </tr>)
        return (
            <div>
                <table>
                    <tr>
                        <th>号码</th>
                        <th>价格</th>
                    </tr>
                    {rows}
                </table>
            </div>
        )
    }
}

ReactDOM.render(
    <App />,
    document.getElementById('root'),
)