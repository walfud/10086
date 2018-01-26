import React, {
    Component,
} from 'react'
import ReactDOM from 'react-dom'
import {
    Input,
} from 'material-ui'

class App extends Component {
    render() {
        return (
            <div style={{
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
            }}>
                <Like />
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
    }

    onChange = (index, oldValue, newValue) => {
        // 控制输入为一个数字
        const diffValue = newValue.replace(oldValue, '')
        const newNum = this.state.num.split('')
        if (!/^\d|\s$/.test(diffValue)) {
            return
        }

        newNum[index] = diffValue
        this.setState({
            num: newNum.join(''),
        })
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
            value={this.state.num[index]}
            onChange={(event) => {this.onChange(index, ele, event.target.value)}}
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