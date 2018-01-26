import React, {
    Component,
} from 'react'
import ReactDOM from 'react-dom'
import {
    Input,
    Button,
} from 'material-ui'

class App extends Component {
    render() {
        return (
            <div style={{
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
            }}>
                <Condition />
            </div>
        )
    }
}

class Condition extends Component {
    constructor() {
        this.like = '1..........'
    }

    onLikeChange = (like) => {
        this.like = like.replace(' ', '.')
    }

    onSearch = () => {
        fetch(`http://10086.walfud.com/api/num?like=${like}`)
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
                    <Like onChange={this.onLikeChange} />
                </div>
                <div style={{
                    display: 'flex',
                    flex: 2,
                }}>
                    <Button
                        raised
                        color="secondary"
                        onClick={this.onSearch}
                    >
                        Secondary
                    </Button>
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
        // 控制输入为一个数字
        const diffValue = newValue.replace(oldValue, '')
        if (!/^\d|\s$/.test(diffValue)) {
            return
        }

        const newNumArr = this.state.num.split('')
        newNumArr[index] = diffValue
        const newNum = newNumArr.join('')
        this.setState({
            num: newNum,
        })

        this.props.onChange && this.props.onChange(newNum)
    }

    render() {
        const child = this.state.num.split('').map((ele, index) => <Input
            style={{
                display: 'flex',
                flex: 1,
                minWidth: 10,
                maxWidth: 60,
                type: 'number',
                borderWidth: 1,
                borderColor: '#666',
                disableUnderline: true,
            }}
            key={index}
            value={this.state.num[index]}
            onChange={(event) => { this.onChange(index, ele, event.target.value) }}
            ref={(input) => this.inputs[index + 1] = input}
        />)

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-around',
            }}>
                {child}
            </div>
        )
    }
}

ReactDOM.render(
    <App />,
    document.getElementById('root'),
)